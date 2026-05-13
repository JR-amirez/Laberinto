describe("Maze board", () => {
  it("renders the maze as a side-view path without wall blocks", () => {
    cy.visit("/");

    cy.contains("Iniciar juego").click();
    cy.get(".maze-grid", { timeout: 8000 }).should("be.visible");

    cy.get(".maze-cell--empty").its("length").should("be.greaterThan", 0);
    cy.get(".maze-cell--empty")
      .first()
      .then(($cell) => {
        const cell = $cell[0];

        expect(getComputedStyle(cell, "::before").display).to.equal("none");
        expect(getComputedStyle(cell, "::after").display).to.equal("none");
      });

    cy.get(".maze-character")
      .should("be.visible")
      .then(($character) => {
        expect(getComputedStyle($character[0]).transform).not.to.contain(
          "rotate",
        );
      });
  });
});
