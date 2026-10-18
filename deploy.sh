#!/bin/bash
# 1. Update the host server configuration libraries
apt-get update && apt-get install -y \
    xvfb \
    x11vnc \
    libx11-dev \
    libxext-dev \
    libxtst-dev \
    libpng-dev \
    graphicsmagick

# 2. Establish a background virtual desktop canvas inside memory
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99

# 3. Fire up the Node engine
node server.js
