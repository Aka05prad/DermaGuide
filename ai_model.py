# import json
# import sys
# from sklearn.feature_extraction.text import CountVectorizer
# from sklearn.metrics.pairwise import cosine_similarity

# def recommend_products(products, skin_type, concern, top_n=6):
#     corpus = [p["description"] + " " + " ".join(p["concerns"]) + " " + " ".join(p["skinType"]) for p in products]
#     vectorizer = CountVectorizer().fit_transform(corpus)
#     vectors = vectorizer.toarray()

#     user_input = f"{skin_type} {concern}"
#     user_vec = vectorizer.transform([user_input]).toarray()

#     similarities = cosine_similarity(user_vec, vectors).flatten()
#     indices = similarities.argsort()[::-1][:top_n]
    
#     return [products[i] for i in indices]

# if __name__ == "__main__":
#     data = json.loads(sys.stdin.read())
#     products = data["products"]
#     skin_type = data["skinType"]
#     concern = data["concern"]

#     results = recommend_products(products, skin_type, concern)
#     print(json.dumps(results))
import sys, json, os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def recommend_products(products, skin_type, concern, limit=5):
    # create simple text corpus for vectorizer
    corpus = [p["description"] + " " + " ".join(p.get("skinType", [])) + " " + " ".join(p.get("concerns", []))
              for p in products]

    # initialize TF-IDF vectorizer
    vectorizer = TfidfVectorizer(stop_words='english')
    matrix = vectorizer.fit_transform(corpus)

    # user input vector
    user_input = f"{skin_type} {concern}"
    user_vec = vectorizer.transform([user_input])

    # compute similarity scores
    similarity = cosine_similarity(user_vec, matrix).flatten()

    # sort by score
    ranked = sorted(list(enumerate(similarity)), key=lambda x: x[1], reverse=True)

    # pick top results
    top_products = [products[i] for i, score in ranked if score > 0][:limit]

    return top_products if top_products else products[:limit]


# ---------- Main execution ----------

try:
    data = json.loads(sys.stdin.read())
except:
    data = {}

skin_type = data.get("skinType", "").lower()
concern = data.get("concern", "").lower()

# Load products.json if not provided in stdin
if "products" in data:
    products = data["products"]
else:
    with open(os.path.join(os.path.dirname(__file__), "products.json"), "r", encoding="utf-8") as f:
        products = json.load(f)

results = recommend_products(products, skin_type, concern)

# print JSON output
print(json.dumps({
    "ok": True,
    "meta": {"skinType": skin_type, "concern": concern},
    "recommendations": results
}, ensure_ascii=False, indent=2))
