from django.db import connection
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from .serializers import MhadaPlotSerializer

class MhadaPlotViewSet(viewsets.ViewSet):
    """
    ViewSet that executes raw PostGIS queries on the imported 'mhada_plot' shapefile table
    and handles spatial transforms, filtering, color code classification, and metadata extraction.
    """
    serializer_class = MhadaPlotSerializer

    # Common SELECT columns used in list and retrieve queries
    _SELECT_COLUMNS = """
        gid,
        COALESCE(state, 'Maharashtra') AS state,
        COALESCE(district, 'Thane') AS district,
        COALESCE(taluka, 'Thane') AS tehsil,
        COALESCE(muncipal_c, 'Thane') AS municipal_corporation,
        COALESCE(ward, 'E') AS ward,
        COALESCE(layoutno, 'PawarNagar') AS layout,
        COALESCE(plotnumber, '') AS plot_number,
        COALESCE(occupant, '') AS occupant,
        COALESCE(firstallot, '') AS first_allottee,
        COALESCE(NULLIF(occupant, ''), firstallot, '') AS owner_name,
        COALESCE(type_of_co, '') AS type_of_code,
        COALESCE(NULLIF(class, ''), 'Residential') AS category,
        CASE
            WHEN color_12 = 'Gray' THEN 'Road'
            WHEN color_12 = 'Green' THEN 'Open Space'
            WHEN color_12 = 'Red' THEN 'Public-Semi Public'
            ELSE 'Residential'
        END AS land_use,
        CASE
            WHEN color_12 = 'Gray' THEN 'Gray'
            WHEN color_12 = 'Green' THEN 'Green'
            WHEN color_12 = 'Red' THEN 'Red'
            ELSE 'Yellow'
        END AS color_code,
        COALESCE(room_no, '') AS room_no,
        COALESCE(NULLIF(structuref, ''), type_of_co, '') AS structure_type,
        COALESCE(grflrarea, 0)::float AS grflr_area,
        COALESCE(f1stflrare, 0)::float AS first_flr_area,
        COALESCE(f2ndflrare, 0)::float AS second_flr_area,
        COALESCE(totalarea, 0)::float AS total_area,
        COALESCE(NULLIF(totalarea, 0), NULLIF(shape_area, 0), ROUND(ST_Area(geom)::numeric, 2), 0)::float AS area_sqm,
        COALESCE(mhadatranf, '') AS mhada_transfer_order,
        COALESCE(NULLIF(mhadatranf, ''), mhada_tran, '') AS transfer_status,
        COALESCE(date, '') AS possession_date,
        COALESCE(mhada_tran, '') AS mhada_transfer,
        CASE 
            WHEN occupant IS NOT NULL AND occupant != '' THEN 'Allocated'
            WHEN plotnumber IS NOT NULL AND plotnumber != '' THEN 'Available'
            ELSE 'Reserved'
        END AS status,
        ST_AsGeoJSON(ST_Centroid(ST_Force2D(ST_Transform(ST_SetSRID(geom, 32643), 4326)))) AS centroid_json,
        ST_AsGeoJSON(ST_Force2D(ST_Transform(ST_SetSRID(geom, 32643), 4326))) AS polygon_json
    """

    def _build_where_clause(self, request):
        where_clause = ""
        params = []
        GET = getattr(request, 'query_params', getattr(request, 'GET', {}))

        state = GET.get('state')
        district = GET.get('district')
        tehsil = GET.get('tehsil')
        municipal_corporation = GET.get('municipal_corporation')
        ward = GET.get('ward')
        layout = GET.get('layout')
        plot_number = GET.get('plot_number')
        search = GET.get('search')
        status = GET.get('status')
        land_use = GET.get('land_use')

        if state:
            where_clause += " AND COALESCE(state, 'Maharashtra') = %s"
            params.append(state)
        if district:
            where_clause += " AND COALESCE(district, 'Thane') = %s"
            params.append(district)
        if tehsil:
            where_clause += " AND COALESCE(taluka, 'Thane') = %s"
            params.append(tehsil)
        if municipal_corporation:
            where_clause += " AND COALESCE(muncipal_c, 'Thane') = %s"
            params.append(municipal_corporation)
        if ward:
            where_clause += " AND COALESCE(ward, 'E') = %s"
            params.append(ward)
        if layout:
            where_clause += " AND COALESCE(layoutno, 'PawarNagar') = %s"
            params.append(layout)
        if plot_number:
            where_clause += " AND COALESCE(plotnumber, '') = %s"
            params.append(plot_number)
        if search:
            where_clause += " AND (layoutno ILIKE %s OR plotnumber ILIKE %s OR occupant ILIKE %s OR firstallot ILIKE %s OR room_no ILIKE %s OR refname ILIKE %s)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%"])

        return where_clause, params

    def list(self, request):
        where_clause, params = self._build_where_clause(request)

        query = f"""
            SELECT {self._SELECT_COLUMNS}
            FROM mhada_plot
            WHERE geom IS NOT NULL {where_clause}
            ORDER BY gid ASC
        """

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            plots = [dict(zip(columns, row)) for row in cursor.fetchall()]

        serializer = MhadaPlotSerializer(plots, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        query = f"""
            SELECT {self._SELECT_COLUMNS}
            FROM mhada_plot
            WHERE gid = %s
        """
        with connection.cursor() as cursor:
            cursor.execute(query, [pk])
            columns = [col[0] for col in cursor.description]
            row = cursor.fetchone()
            if not row:
                return Response({"error": "Plot not found"}, status=404)
            plot = dict(zip(columns, row))

        serializer = MhadaPlotSerializer(plot)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def metadata(self, request):
        """
        Returns dynamic dropdown lists for filters based on actual imported shapefile data.
        Can optionally filter plot numbers based on selected layout.
        """
        GET = getattr(request, 'query_params', getattr(request, 'GET', {}))
        layout = GET.get('layout')

        with connection.cursor() as cursor:
            cursor.execute("SELECT DISTINCT state FROM mhada_plot WHERE state IS NOT NULL AND state != '' ORDER BY state")
            states = [row[0] for row in cursor.fetchall()] or ['Maharashtra']

            cursor.execute("SELECT DISTINCT district FROM mhada_plot WHERE district IS NOT NULL AND district != '' ORDER BY district")
            districts = [row[0] for row in cursor.fetchall()] or ['Thane']

            cursor.execute("SELECT DISTINCT taluka FROM mhada_plot WHERE taluka IS NOT NULL AND taluka != '' ORDER BY taluka")
            tehsils = [row[0] for row in cursor.fetchall()] or ['Thane']

            cursor.execute("SELECT DISTINCT muncipal_c FROM mhada_plot WHERE muncipal_c IS NOT NULL AND muncipal_c != '' ORDER BY muncipal_c")
            municipal_corporations = [row[0] for row in cursor.fetchall()] or ['Thane']

            cursor.execute("SELECT DISTINCT ward FROM mhada_plot WHERE ward IS NOT NULL AND ward != '' ORDER BY ward")
            wards = [row[0] for row in cursor.fetchall()] or ['E']

            cursor.execute("SELECT DISTINCT layoutno FROM mhada_plot WHERE layoutno IS NOT NULL AND layoutno != '' ORDER BY layoutno")
            layouts = [row[0] for row in cursor.fetchall()]

            if layout:
                cursor.execute("""
                    SELECT DISTINCT plotnumber 
                    FROM mhada_plot 
                    WHERE plotnumber IS NOT NULL AND plotnumber != '' AND layoutno = %s 
                    ORDER BY plotnumber
                """, [layout])
            else:
                cursor.execute("""
                    SELECT DISTINCT plotnumber 
                    FROM mhada_plot 
                    WHERE plotnumber IS NOT NULL AND plotnumber != '' 
                    ORDER BY plotnumber
                """)
            plot_numbers = [row[0] for row in cursor.fetchall()]

        return Response({
            "states": states,
            "districts": districts,
            "tehsils": tehsils,
            "municipal_corporations": municipal_corporations,
            "wards": wards,
            "layouts": layouts,
            "plot_numbers": plot_numbers
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Calculates dynamic metrics based on active filters on the shapefile table.
        """
        where_clause, params = self._build_where_clause(request)

        with connection.cursor() as cursor:
            # 1. Overall stats
            cursor.execute(f"""
                SELECT COUNT(*), 
                       COALESCE(SUM(COALESCE(NULLIF(totalarea, 0), NULLIF(shape_area, 0), ST_Area(geom)::numeric, 0)), 0)
                FROM mhada_plot
                WHERE geom IS NOT NULL {where_clause}
            """, params)
            total_plots, total_area = cursor.fetchone()

            # 2. Land use breakdown via subquery
            cursor.execute(f"""
                SELECT sub.land_use_calc,
                       COUNT(*),
                       COALESCE(SUM(sub.calc_area), 0)::float
                FROM (
                    SELECT CASE
                               WHEN color_12 = 'Gray' THEN 'Road'
                               WHEN color_12 = 'Green' THEN 'Open Space'
                               WHEN color_12 = 'Red' THEN 'Public-Semi Public'
                               ELSE 'Residential'
                           END AS land_use_calc,
                           COALESCE(NULLIF(totalarea, 0), NULLIF(shape_area, 0), ST_Area(geom)::numeric, 0) AS calc_area
                    FROM mhada_plot
                    WHERE geom IS NOT NULL {where_clause}
                ) sub
                GROUP BY sub.land_use_calc
            """, params)
            category_breakdown = {row[0]: {"count": row[1], "area": float(row[2])} for row in cursor.fetchall()}

        return Response({
            "total_plots": total_plots,
            "total_area": float(total_area),
            "status_breakdown": {},
            "category_breakdown": category_breakdown
        })
