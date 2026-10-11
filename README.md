# AsadAI Backend

Backend server for the AsadAI website.

## Requirements

- Node.js 18 or newer
- npm

## Run locally

Install dependencies:

    npm install

Start the server:

    npm start

## Render settings

Language: Node

Root Directory: leave empty

Build Command:

    npm install

Start Command:

    npm start

## Endpoints

GET /

GET /health

GET /api/models

POST /api/generate

## Environment variables

PORT is supplied by Render automatically.

FRONTEND_ORIGIN is optional and can contain a comma-separated
list of allowed frontend origins.

Do not store API secrets in GitHub or frontend code.

## Generation status

Video generation is not connected yet. Configure a verified
provider API adapter before enabling any model.

