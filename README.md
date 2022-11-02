# Mosquitto Auth Gateway

A service to connect Mosquitto's mosquitto-go-auth plugin to the user manager API

## Environment variables

| Variable | Description |
| --- | --- |
| LOGIN_URL | URL for user login |
| IDENTIFICATION_URL | URL used to identify users |

## A note on /superuser

In the /superuser endpoint, the request body only contains username. To identify the user as administrator, the username must be the user JWT.