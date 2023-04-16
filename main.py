from flask import Flask, request
from flask import send_from_directory
import json
import firebase_admin
from firebase_admin import firestore
import anyrest

import os
os.environ['GRPC_DNS_RESOLVER'] = 'native'

firebase_app = firebase_admin.initialize_app(options={'projectId': '[PROJECT_ID]'})
db = firestore.client()

app = Flask(__name__)
ar = anyrest.addAnyrestHandlers(app, db)
#ar = anyrest.addAnyrestHandlers(app, db, "[DOMAIN]", "[IDENTIFIER]")

@app.route('/')
def index():
    return send_from_directory("build", "index.html")

@app.route('/<path:path>')
def frontend(path):
    return send_from_directory("build", path)

if __name__ == '__main__':
    from flask_cors import CORS
    CORS(app)
    app.run(host='127.0.0.1', port=8080, debug=True)
