document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('skinForm');
  const resultSection = document.getElementById('resultSection');
  const aiResult = document.getElementById('aiResult');

  if (!form || !resultSection || !aiResult) {
    console.warn("AI Analyzer elements not found on this page.");
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const skinType = document.getElementById('skinType').value;
    const skinConcern = document.getElementById('skinConcern').value;

    resultSection.style.display = "block";
    aiResult.innerHTML = `
      <div class="text-center text-secondary py-3">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-2 mb-0">Analyzing your skin...</p>
      </div>
    `;

    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skinType, concern: skinConcern })
      });

      const data = await response.json();

      if (data.ok && data.recommendations?.length > 0) {
        aiResult.innerHTML = `
          <h4 class="mb-4 text-success fw-semibold">✨ Your AI-Recommended Products</h4>
          <div class="row justify-content-center">
            ${data.recommendations.map(p => `
              <div class="col-md-4 mb-4">
                <div class="card h-100 shadow-sm border-0 hover-card">
                  <img src="${p.image}" class="card-img-top" alt="${p.name}" style="height:200px;object-fit:cover;">
                  <div class="card-body">
                    <h5 class="card-title text-primary">${p.name}</h5>
                    <p class="card-text small text-muted">${p.description}</p>
                    <a href="${p.buy_link}" target="_blank" class="btn btn-sm btn-outline-info w-100">Buy Now</a>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        aiResult.innerHTML = `<div class="alert alert-info">😅 No matching products found. Try a different combination.</div>`;
      }
    } catch (err) {
      console.error(err);
      aiResult.innerHTML = `<div class="alert alert-danger">❌ Server not responding. Please check backend connection.</div>`;
    }

    resultSection.scrollIntoView({ behavior: 'smooth' });
  });
});
