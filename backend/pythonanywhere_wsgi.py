# ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
# PythonAnywhere WSGI Configuration File
# 
# In PythonAnywhere Web Tab:
# 1. Click on your WSGI configuration file link (e.g., /var/www/yourusername_pythonanywhere_com_wsgi.py)
# 2. Replace its content with this file (make sure to replace 'yourusername' with your actual PythonAnywhere username)
# ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

import os
import sys

# Replace 'yourusername' with your actual PythonAnywhere username
username = 'yourusername'

# Path to your project directory on PythonAnywhere
path = f'/home/{username}/mahada-kokan/backend'
if path not in sys.path:
    sys.path.insert(0, path)

# Set environment variables
os.environ['DJANGO_SETTINGS_MODULE'] = 'backend.settings'
os.environ['DATABASE_URL'] = 'postgresql://neondb_owner:npg_xh7b9uKDPcFC@ep-restless-lake-aeiv3cuj-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
