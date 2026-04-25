import os
import logging
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)


def search_youtube_videos(query, max_results=10):
    api_key = os.getenv('YOUTUBE_API_KEY')
    if not api_key:
        logger.warning("YOUTUBE_API_KEY not set in environment")
        return []

    try:
        youtube = build('youtube', 'v3', developerKey=api_key)

        request = youtube.search().list(
            q=query + ' full course tutorial free',
            part='snippet',
            maxResults=max_results * 2,  # fetch more to filter
            type='video',
            videoDuration='long',        # only long videos (>20 min)
            order='relevance',
            relevanceLanguage='en',
        )
        response = request.execute()

        results = []
        for item in response.get('items', []):
            video_id = item['id']['videoId']
            snippet  = item['snippet']

            results.append({
                'title':            snippet.get('title', ''),
                'description':      snippet.get('description', '')[:200],
                'url':              f'https://www.youtube.com/watch?v={video_id}',
                'thumbnail_url':    snippet.get('thumbnails', {}).get('high', {}).get('url', ''),
                'youtube_video_id': video_id,
                'platform':         'YouTube',
                'is_free':          True,
                'resource_type':    'VIDEO',
                'duration':         'Long form',
                'channel':          snippet.get('channelTitle', ''),
            })

            if len(results) >= max_results:
                break

        return results

    except HttpError as e:
        logger.error(f"YouTube API error: {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return []