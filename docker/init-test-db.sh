#!/bin/bash
# Creates the test database alongside the main database.
# This script is run by PostgreSQL's docker-entrypoint-initdb.d mechanism
# on first container startup. The POSTGRES_DB (sahovat) is already created
# by the entrypoint; we only need to add the test DB.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE sahovat_test;
    GRANT ALL PRIVILEGES ON DATABASE sahovat_test TO $POSTGRES_USER;
EOSQL

echo "Test database 'sahovat_test' created."
