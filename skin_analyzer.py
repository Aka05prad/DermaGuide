from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageOps
import numpy as np
import tensorflow as tf
import io, base64, os

app = Flask(__name__)
CORS(app)

# ── Load your Teachable Machine model once at startup ─────────────────────────
MODEL_PATH  = os.path.join('model', 'keras_model.h5')
LABELS_PATH = os.path.join('model', 'labels.txt')

print("Loading skin analysis model...")
model = tf.keras.models.load_model(MODEL_PATH, compile=False)

# Read class labels from labels.txt (they're in order matching model output)
with open(LABELS_PATH, 'r') as f:
    labels = [line.strip().split(' ', 1)[-1] for line in f.readlines()]
    # labels.txt lines look like "0 acne" — we only want "acne"

print(f"Model loaded! Classes: {labels}")


# ── Image preprocessing ───────────────────────────────────────────────────────
# Teachable Machine always expects 224x224 RGB images, normalized to [-1, 1]
def preprocess_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')

    # Resize + crop to exactly 224x224 (same way Teachable Machine trained)
    img = ImageOps.fit(img, (224, 224), Image.Resampling.LANCZOS)

    # Convert to numpy array and normalize to [-1, 1]
    arr = np.asarray(img, dtype=np.float32)
    arr = (arr / 127.5) - 1.0          # this is Teachable Machine's exact normalization

    return np.expand_dims(arr, axis=0)  # shape: (1, 224, 224, 3)


# ── Main analysis endpoint ────────────────────────────────────────────────────
@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()

        # Accept base64-encoded image from Node.js
        image_bytes = base64.b64decode(data['image'])
        processed   = preprocess_image(image_bytes)

        # Run prediction
        predictions = model.predict(processed, verbose=0)[0]  # shape: (num_classes,)

        # Build a dict of { condition: confidence_score }
        results = {
            labels[i]: round(float(predictions[i]) * 100, 1)  # convert to percentage
            for i in range(len(labels))
        }

        # Only report conditions the model is reasonably confident about (>25%)
        detected = [label for label, score in results.items() if score > 25.0]

        # Sort by confidence for display
        sorted_results = dict(sorted(results.items(), key=lambda x: x[1], reverse=True))

        return jsonify({
            'ok':        True,
            'scores':    sorted_results,   # e.g. {"acne": 78.3, "clear": 12.1, ...}
            'detected':  detected,          # e.g. ["acne"]
            'primary':   labels[int(np.argmax(predictions))]  # top prediction
        })

    except Exception as e:
        return jsonify({ 'ok': False, 'error': str(e) }), 500


# ── Health check (useful for debugging) ──────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({ 'ok': True, 'classes': labels, 'model_loaded': model is not None })


if __name__ == '__main__':
    app.run(port=5001, debug=True)