#!/bin/sh

source venv/bin/activate
python main.py &
npm run dev
