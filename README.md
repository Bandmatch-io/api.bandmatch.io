# api.bandmatch.io
The API component for bandmatch.io v2.0.0 forwards

## The /config/environment.json file
```json
{
    "host_name": "http://localhost:3000",
    "Airbrake": {
        "id": Airbrake ID,
        "key": "Airbrake key"
    },
    "Database": {
        "url": "db url",
        "port": db port,
        "db": "DB Collection"
    },
    "Sessions": {
        "Database": {
            "url": "db url",
            "port": db port,
            "db": "DB Collection"
        },
        "secret": "A secret code",
        "ageInDays": max length of session
    },
    "Mailer": {
        "test": "true/false",
        "host": "email host",
        "port": 465,
        "auth": {
            "user": "Your Email",
            "pass": "*****"
        },
        "inactivityLengthMinutes": timeout length
    },
    "anon_whitelist": ["Regex"]
}
```