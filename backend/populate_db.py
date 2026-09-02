import psycopg2
import random
from datetime import date, timedelta

def populate():
    # Connection details
    conn = psycopg2.connect(
        "postgresql://neondb_owner:npg_xh7b9uKDPcFC@ep-still-sky-ae8lh028-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
    )
    cursor = conn.cursor()
    print("Enabling PostGIS extension...")
    cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    conn.commit()

    # Drop old table to clean schema differences
    print("Dropping old table if exists...")
    cursor.execute("DROP TABLE IF EXISTS mhada_plots CASCADE;")

    # Create table with PostGIS geometry column and new filter fields
    print("Creating table 'mhada_plots' with updated fields...")
    cursor.execute("""
        CREATE TABLE mhada_plots (
            gid SERIAL PRIMARY KEY,
            state VARCHAR(50) NOT NULL DEFAULT 'Maharashtra',
            district VARCHAR(50) NOT NULL,
            tehsil VARCHAR(50) NOT NULL,
            municipal_corporation VARCHAR(100) NOT NULL,
            ward VARCHAR(50) NOT NULL,
            layout VARCHAR(100) NOT NULL,
            plot_number VARCHAR(50) NOT NULL,
            category VARCHAR(50) NOT NULL,
            income_group VARCHAR(10) NOT NULL,
            area_sqm NUMERIC(10, 2) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'Available',
            owner_name VARCHAR(100),
            possession_date DATE,
            geom geometry(Polygon, 32643)
        );
    """)
    
    # Create GIST index
    cursor.execute("CREATE INDEX IF NOT EXISTS mhada_plots_geom_idx ON mhada_plots USING gist(geom);")

    # Configurations for 5 housing schemes in the Konkan region
    schemes = [
        {
            "layout": "Kalyan Elite Enclave",
            "district": "Thane",
            "tehsil": "Kalyan",
            "municipal_corporation": "Kalyan-Dombivli Municipal Corporation",
            "lat": 19.2400,
            "lon": 73.1250,
            "prefix": "KYL",
            "income_groups": ["HIG", "MIG", "LIG"],
        },
        {
            "layout": "Virar Bolinj Meadows",
            "district": "Palghar",
            "tehsil": "Vasai",
            "municipal_corporation": "Vasai-Virar Municipal Corporation",
            "lat": 19.4500,
            "lon": 72.8050,
            "prefix": "VIR",
            "income_groups": ["LIG", "EWS", "MIG"],
        },
        {
            "layout": "Taloja Smart City Layout",
            "district": "Raigad",
            "tehsil": "Panvel",
            "municipal_corporation": "Panvel Municipal Corporation",
            "lat": 19.0300,
            "lon": 73.0800,
            "prefix": "TLJ",
            "income_groups": ["MIG", "HIG", "EWS"],
        },
        {
            "layout": "Ratnagiri Coconut Grove",
            "district": "Ratnagiri",
            "tehsil": "Ratnagiri",
            "municipal_corporation": "Ratnagiri Municipal Council",
            "lat": 16.9900,
            "lon": 73.3000,
            "prefix": "RTN",
            "income_groups": ["LIG", "MIG"],
        },
        {
            "layout": "Sawantwadi Royal Valley",
            "district": "Sindhudurg",
            "tehsil": "Sawantwadi",
            "municipal_corporation": "Sawantwadi Municipal Council",
            "lat": 15.9000,
            "lon": 73.8100,
            "prefix": "SWD",
            "income_groups": ["HIG", "MIG"],
        }
    ]

    categories = ["Residential", "Commercial", "Public Utility", "Open Space"]
    statuses = ["Available", "Allocated", "Reserved", "Under Dispute"]
    
    owners = [
        "Rajesh Sharma", "Aniket Patil", "Priya Deshmukh", "Siddharth Shinde",
        "Sunita Kamble", "Rahul Sawant", "Amit Naik", "Sneha Kadam",
        "Vikram Mhatre", "Jyoti Pawar", "Sandeep Bhagat", "Archana Joshi"
    ]

    # Generate a 4x4 grid of plots for each scheme
    plot_size = 0.0003         # width/height of a plot in decimal degrees (~30m)
    plot_gap = 0.00008          # gap between plots (roads) (~8m)
    plot_spacing = plot_size + plot_gap

    print("Generating grids of spatial plots with new schema...")
    inserted_count = 0

    for scheme in schemes:
        lat_base = scheme["lat"]
        lon_base = scheme["lon"]
        
        for i in range(4):     # 4 rows
            for j in range(4): # 4 columns
                plot_num = i * 4 + j + 1
                plot_number = f"{scheme['prefix']}-{plot_num:03d}"
                ward = f"Ward {random.randint(1, 4)}"
                
                # Determine boundaries in lat/lon
                lon_min = lon_base + j * plot_spacing
                lat_min = lat_base + i * plot_spacing
                lon_max = lon_min + plot_size
                lat_max = lat_min + plot_size
                
                # WKT Polygon format
                wkt_polygon = f"POLYGON(({lon_min} {lat_min}, {lon_max} {lat_min}, {lon_max} {lat_max}, {lon_min} {lat_max}, {lon_min} {lat_min}))"
                
                # Distribute categories deterministically
                if plot_num in [15, 16]:
                    category = "Open Space"
                    status = "Reserved"
                    income_group = "N/A"
                elif plot_num == 14:
                    category = "Public Utility"
                    status = "Available"
                    income_group = "N/A"
                elif plot_num in [9, 10, 11]:
                    category = "Commercial"
                    status = random.choice(["Available", "Allocated"])
                    income_group = "N/A"
                else:
                    category = "Residential"
                    status = random.choices(statuses, weights=[40, 45, 10, 5], k=1)[0]
                    income_group = random.choice(scheme["income_groups"])

                # Handle allocations
                owner_name = None
                possession_date = None
                if status == "Allocated":
                    owner_name = random.choice(owners)
                    days_ago = random.randint(1, 730)
                    possession_date = date.today() - timedelta(days=days_ago)
                
                # Raw SQL to insert plot and calculate area using PostGIS
                cursor.execute("""
                    INSERT INTO mhada_plots (
                        state, district, tehsil, municipal_corporation, ward, layout, plot_number, category, income_group, status, owner_name, possession_date, geom, area_sqm
                    )
                    VALUES (
                        'Maharashtra', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        ST_Transform(ST_SetSRID(ST_GeomFromText(%s), 4326), 32643),
                        ST_Area(ST_Transform(ST_SetSRID(ST_GeomFromText(%s), 4326), 32643))
                    )
                """, (
                    scheme["district"],
                    scheme["tehsil"],
                    scheme["municipal_corporation"],
                    ward,
                    scheme["layout"],
                    plot_number,
                    category,
                    income_group,
                    status,
                    owner_name,
                    possession_date,
                    wkt_polygon,
                    wkt_polygon
                ))
                inserted_count += 1

    conn.commit()
    cursor.close()
    conn.close()
    print(f"Successfully inserted {inserted_count} plots into the 'mhada_plots' table.")

if __name__ == "__main__":
    populate()
