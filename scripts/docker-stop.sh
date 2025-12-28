#!/bin/bash

# Stop all running Docker containers
echo "Stopping Docker services..."
docker-compose down

echo "Services stopped and removed."
echo ""
echo "To also remove the PostgreSQL data volume, run:"
echo "  docker-compose down -v"
