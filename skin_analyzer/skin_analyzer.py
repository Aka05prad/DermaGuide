from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageOps
import numpy as np
import tensorflow as tf
import io, base64, os

app = Flask(__name__)
CORS(app)

MODEL_PATH  = os.path.join(os.path.dirname(__file__), 'model', 'keras_model.h5')
LABELS_PATH = os.path.join(os.path.dirname(__file__), 'model', 'labels.txt')

print("Loading skin analysis model...")
model = tf.keras.models.load_model(MODEL_PATH, compile=False)

with open(LABELS_PATH, 'r') as f:
    labels = [line.strip().split(' ', 1)[-1] for line in f.readlines()]

print(f"Model loaded! Classes: {labels}")


def preprocess_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img = ImageOps.fit(img, (224, 224), Image.Resampling.LANCZOS)
    arr = np.asarray(img, dtype=np.float32)
    arr = (arr / 127.5) - 1.0
    return np.expand_dims(arr, axis=0)


@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data        = request.get_json()
        image_bytes = base64.b64decode(data['image'])
        processed   = preprocess_image(image_bytes)
        # predictions = model.predict(processed, verbose=0)[0]
        predictions = model(processed, training=False).numpy()[0]

        results = {
            labels[i]: round(float(predictions[i]) * 100, 1)
            for i in range(len(labels))
        }
        detected      = [label for label, score in results.items() if score > 25.0]
        sorted_results = dict(sorted(results.items(), key=lambda x: x[1], reverse=True))

        return jsonify({
            'ok':      True,
            'scores':  sorted_results,
            'detected': detected,
            'primary': labels[int(np.argmax(predictions))]
        })

    except Exception as e:
        return jsonify({ 'ok': False, 'error': str(e) }), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({ 'ok': True, 'classes': labels, 'model_loaded': model is not None })


# ── This is what Render needs ─────────────────────────────────
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)