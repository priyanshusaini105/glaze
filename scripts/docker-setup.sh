#!/bin/bash

# Docker setup and startup script for Glaze

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Glaze Docker Setup ===${NC}\n"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}\n"

# Check if .env.docker file exists
if [ ! -f .env.docker ]; then
    echo -e "${YELLOW}⚠ .env.docker file not found. Creating from defaults...${NC}"
    cp .env.docker.example .env.docker 2>/dev/null || {
        echo -e "${RED}Please create .env.docker file first${NC}"
        exit 1
    }
fi

# Build and start services
echo -e "${YELLOW}Building Docker images...${NC}\n"
docker-compose build

echo -e "\n${YELLOW}Starting services...${NC}\n"
docker-compose up -d

# Wait for services to be healthy
echo -e "\n${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Check if services are running
if docker-compose ps | grep -q "postgres.*Up"; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}✗ PostgreSQL failed to start${NC}"
    docker-compose logs postgres
    exit 1
fi

if docker-compose ps | grep -q "api.*Up"; then
    echo -e "${GREEN}✓ API is running${NC}"
else
    echo -e "${YELLOW}⚠ API is starting...${NC}"
fi

if docker-compose ps | grep -q "web.*Up"; then
    echo -e "${GREEN}✓ Web frontend is running${NC}"
else
    echo -e "${YELLOW}⚠ Web frontend is starting...${NC}"
fi

echo -e "\n${GREEN}=== Services Started ===${NC}\n"
echo "PostgreSQL:  postgresql://postgres:postgres@localhost:5432/glaze_db"
echo "API:         http://localhost:3001"
echo "Web:         http://localhost:3000"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  View logs:     docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Clean up:      docker-compose down -v"
echo ""
