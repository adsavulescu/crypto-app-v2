#!/bin/bash

# MongoDB 7.0 Installation Script for Ubuntu 22.04

echo "Installing MongoDB 7.0 on Ubuntu 22.04..."

# Import MongoDB GPG key
echo "Adding MongoDB GPG key..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Add MongoDB repository
echo "Adding MongoDB repository..."
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package list
echo "Updating package list..."
sudo apt-get update

# Install MongoDB
echo "Installing MongoDB..."
sudo apt-get install -y mongodb-org

# Start and enable MongoDB service
echo "Starting MongoDB service..."
sudo systemctl start mongod
sudo systemctl enable mongod

# Check MongoDB status
echo "Checking MongoDB status..."
sudo systemctl status mongod

echo "MongoDB installation complete!"
echo "You can connect to MongoDB using: mongosh"