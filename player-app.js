document.addEventListener("DOMContentLoaded", () => {
    const importCharacter = document.getElementById("importCharacter");
    const characterCard = document.getElementById("characterCard");

    importCharacter.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            renderCharacter(data);
        } catch (err) {
            characterCard.innerHTML = "<p style='color:red'>Invalid JSON file.</p>";
        }
    });

    function renderCharacter(data) {
        characterCard.innerHTML = `
            <h2>${data.name}</h2>
            <p><strong>Pronouns:</strong> ${data.pronouns}</p>
            <p><strong>Color:</strong> ${data.color}</p>
            <div class="portraits">
                <img src="${data.portraits?.streetwear || 'images/placeholder-streetwear.png'}" alt="Streetwear portrait" width="150"/>
                <img src="${data.portraits?.qfactor || 'images/placeholder-qfactor.png'}" alt="Q-Factor portrait" width="150"/>
            </div>
        `;
    }
});