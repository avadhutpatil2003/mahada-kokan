import psycopg2
from psycopg2.extras import execute_values

local_url = 'postgres://postgres:Pass@localhost:5432/mhada'
neon_url = 'postgresql://neondb_owner:npg_xh7b9uKDPcFC@ep-restless-lake-aeiv3cuj-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require'

print("Connecting to local database...", flush=True)
conn_local = psycopg2.connect(local_url)
cur_local = conn_local.cursor()

print("Connecting to Neon database...", flush=True)
conn_neon = psycopg2.connect(neon_url)
conn_neon.autocommit = True
cur_neon = conn_neon.cursor()

print("Enabling PostGIS extension on Neon...", flush=True)
cur_neon.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

cur_local.execute("""
    SELECT column_name, data_type, udt_name 
    FROM information_schema.columns 
    WHERE table_name = 'mhada_plot'
    ORDER BY ordinal_position;
""")
columns = cur_local.fetchall()
print(f"Found {len(columns)} columns in local mhada_plot table.", flush=True)

print("Dropping existing mhada_plot table on Neon...", flush=True)
cur_neon.execute("DROP TABLE IF EXISTS mhada_plot CASCADE;")

col_defs = []
for col_name, data_type, udt_name in columns:
    if col_name == 'gid':
        col_defs.append('gid SERIAL PRIMARY KEY')
    elif udt_name == 'geometry':
        col_defs.append('geom geometry')
    elif data_type == 'character varying':
        col_defs.append(f'"{col_name}" VARCHAR(255)')
    elif data_type == 'numeric':
        col_defs.append(f'"{col_name}" NUMERIC')
    elif data_type == 'integer':
        col_defs.append(f'"{col_name}" INTEGER')
    elif data_type == 'double precision':
        col_defs.append(f'"{col_name}" DOUBLE PRECISION')
    else:
        col_defs.append(f'"{col_name}" {data_type}')

create_sql = f'CREATE TABLE mhada_plot ({ ", ".join(col_defs) });'
print("Creating table 'mhada_plot' on Neon...", flush=True)
cur_neon.execute(create_sql)
cur_neon.execute("CREATE INDEX IF NOT EXISTS mhada_plot_geom_idx ON mhada_plot USING gist(geom);")

col_names = [f'"{c[0]}"' for c in columns if c[0] != 'gid']
cur_local.execute(f'SELECT { ", ".join(col_names) } FROM mhada_plot ORDER BY gid;')
rows = cur_local.fetchall()
print(f"Transferring {len(rows)} plot records to Neon using execute_values...", flush=True)

insert_sql = f'INSERT INTO mhada_plot ({ ", ".join(col_names) }) VALUES %s'
execute_values(cur_neon, insert_sql, rows, page_size=500)

cur_neon.execute("SELECT count(*) FROM mhada_plot;")
neon_count = cur_neon.fetchone()[0]
print(f"SUCCESS: Neon 'mhada_plot' table now has {neon_count} records!", flush=True)

cur_local.close()
conn_local.close()
cur_neon.close()
conn_neon.close()
