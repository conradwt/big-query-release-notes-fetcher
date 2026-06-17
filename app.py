import os
import re
import logging
import xml.etree.ElementTree as ET
from datetime import datetime
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Simple in-memory cache for release notes
cache = {
    'data': None,
    'last_updated': None
}
CACHE_TIMEOUT_SECONDS = 300  # 5 minutes

def compose_tweet(type_name, text_content, date, link):
    """
    Composes a tweet description within the 280-character limit.
    Includes the date, type, snippet of content, and the link.
    """
    prefix = f"BigQuery [{date}] - {type_name}: "
    suffix = f" {link} #BigQuery #GoogleCloud"
    
    # Calculate available characters for text
    # Max length = 280 - len(prefix) - len(suffix) - 3 (for ellipsis)
    max_text_len = 280 - len(prefix) - len(suffix) - 3
    
    if max_text_len <= 10:
        # Fallback if prefix and suffix are too long
        return f"BigQuery Update for {date}: {link}"
        
    if len(text_content) > max_text_len:
        trimmed_text = text_content[:max_text_len].strip() + "..."
    else:
        trimmed_text = text_content
        
    return f"{prefix}{trimmed_text}{suffix}"

def build_update_item(type_name, html_chunks, date, link):
    """
    Converts HTML chunks into structured update details.
    """
    if not type_name:
        type_name = 'Update'
    
    html_content = "".join(html_chunks).strip()
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Resolve relative URLs to absolute URLs
    for a_tag in soup.find_all('a', href=True):
        href = a_tag['href']
        if href.startswith('/'):
            a_tag['href'] = urljoin('https://cloud.google.com', href)
        elif not href.startswith('http://') and not href.startswith('https://'):
            a_tag['href'] = urljoin('https://cloud.google.com/bigquery/docs/', href)
            
    # Extract clean text content
    text_content = soup.get_text().strip()
    text_content = re.sub(r'\s+', ' ', text_content)
    
    # Generate the default tweet text
    tweet_text = compose_tweet(type_name, text_content, date, link)
    
    return {
        'type': type_name,
        'html': str(soup),
        'text': text_content,
        'tweet_text': tweet_text
    }

def fetch_and_parse_notes():
    """
    Fetches the BigQuery Release Notes RSS feed and parses it.
    """
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    logger.info(f"Fetching release notes from {url}")
    
    response = requests.get(url, timeout=15)
    response.raise_for_status()
    
    # Parse XML feed
    root = ET.fromstring(response.content)
    # Atom feeds use namespaces
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    for entry in root.findall('atom:entry', namespaces):
        title = entry.find('atom:title', namespaces).text or ''
        updated = entry.find('atom:updated', namespaces).text or ''
        
        # Parse date representation
        # June 16, 2026 -> formatted for sorting/display
        
        link_elem = entry.find("atom:link[@rel='alternate']", namespaces)
        link = link_elem.attrib.get('href') if link_elem is not None else 'https://cloud.google.com/bigquery/docs/release-notes'
        
        content_elem = entry.find('atom:content', namespaces)
        content_html = content_elem.text if content_elem is not None else ''
        
        soup = BeautifulSoup(content_html, 'html.parser')
        
        updates = []
        current_type = None
        current_html_chunks = []
        
        # Iterate over root level elements in content
        # Release notes typically use <h3>Type</h3> followed by paragraphs/lists
        for child in soup.children:
            if child.name == 'h3':
                if current_type or current_html_chunks:
                    updates.append(build_update_item(current_type, current_html_chunks, title, link))
                current_type = child.get_text().strip()
                current_html_chunks = []
            elif child.name is not None:
                current_html_chunks.append(str(child))
                
        # Add trailing update
        if current_type or current_html_chunks:
            updates.append(build_update_item(current_type, current_html_chunks, title, link))
            
        # Fallback if no <h3> structured elements found
        if not updates and content_html.strip():
            text_content = soup.get_text().strip()
            text_content = re.sub(r'\s+', ' ', text_content)
            updates.append({
                'type': 'Update',
                'html': content_html,
                'text': text_content,
                'tweet_text': compose_tweet('Update', text_content, title, link)
            })
            
        entries.append({
            'date': title,
            'updated': updated,
            'link': link,
            'updates': updates
        })
        
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = datetime.now()
    
    # Use cache if available and not expired
    if not force_refresh and cache['data'] is not None and cache['last_updated'] is not None:
        elapsed = (now - cache['last_updated']).total_seconds()
        if elapsed < CACHE_TIMEOUT_SECONDS:
            logger.info("Serving release notes from cache")
            return jsonify({
                'source': 'cache',
                'last_updated': cache['last_updated'].isoformat(),
                'entries': cache['data']
            })
            
    try:
        data = fetch_and_parse_notes()
        cache['data'] = data
        cache['last_updated'] = now
        return jsonify({
            'source': 'network',
            'last_updated': now.isoformat(),
            'entries': data
        })
    except Exception as e:
        logger.error(f"Failed to fetch release notes: {e}", exc_info=True)
        # Fallback to cache even if expired if we encounter an error
        if cache['data'] is not None:
            logger.warning("Network request failed. Serving expired cache data.")
            return jsonify({
                'source': 'expired_cache_fallback',
                'last_updated': cache['last_updated'].isoformat(),
                'entries': cache['data'],
                'error': str(e)
            })
        return jsonify({
            'error': 'Failed to fetch release notes from Google Cloud feed.',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    # Default port for development
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
