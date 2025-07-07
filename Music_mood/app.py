from flask import Flask, render_template, request
import requests
import random
import os

app = Flask(__name__)

YOUTUBE_API_KEY = "AIzaSyCQpzzzc99E--Q7VSwcxgDFfcQhQdsEiwo"
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

# Simple cheer-up messages
cheer_messages = {
    "happy": "Glad you're feeling good! Here's something to keep it going.",
    "sad": "It’s okay to feel down sometimes. Let this lift your spirits.",
    "angry": "Take a deep breath. This music might help you relax.",
    "tired": "Rest up, but here’s something to energize you.",
    "stressed": "Let the music melt your stress away.",
    "default": "Music can be magic. Here’s something we picked for you."
}

def get_youtube_music(query):
    params = {
        'part': 'snippet',
        'q': f"{query} music",
        'type': 'video',
        'key': YOUTUBE_API_KEY,
        'maxResults': 5
    }
    response = requests.get(YOUTUBE_SEARCH_URL, params=params)
    items = response.json().get('items', [])
    videos = [{
        'title': item['snippet']['title'],
        'video_id': item['id']['videoId']
    } for item in items]
    return videos

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/recommend', methods=['POST'])
def recommend():
    mood = request.form['mood'].lower()

    # Choose a cheer-up message
    message = cheer_messages.get(mood, cheer_messages['default'])

    # Search YouTube for mood-based music
    songs = get_youtube_music(mood)

    return render_template('result.html', mood=mood, message=message, songs=songs)

if __name__ == '__main__':
    app.run(debug=True)
