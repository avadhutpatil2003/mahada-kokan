#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "Installing python packages..."
pip install -r requirements.txt

echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "Running migrations..."
python manage.py migrate

echo "Build complete."
