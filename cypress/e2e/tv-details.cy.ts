describe('TV Details', () => {
  it('loads a tv details page', () => {
    cy.loginAsAdmin();
    // Try to load stranger things
    cy.visit('/tv/66732');

    cy.get('[data-testid=media-title]').should(
      'contain',
      'Stranger Things (2016)'
    );
  });

  it('shows seasons and expands episodes', () => {
    cy.loginAsAdmin();

    // Try to load stranger things
    cy.visit('/tv/66732');

    // intercept request for season info
    cy.intercept('/api/v1/tv/66732/season/4').as('season4');

    cy.contains('Season 4').should('be.visible').scrollIntoView().click();

    cy.wait('@season4');

    cy.contains('Chapter Nine').should('be.visible');
  });

  it('shows streaming providers and a future premiere warning in the request modal', () => {
    cy.loginAsAdmin();

    cy.intercept('GET', '/api/v1/tv/66732', (req) => {
      req.continue((res) => {
        res.body = {
          ...res.body,
          firstAirDate: '2026-05-10',
          watchProviders: [
            {
              iso_3166_1: 'US',
              flatrate: [
                {
                  id: 8,
                  name: 'Netflix',
                  logoPath: '/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg',
                  displayPriority: 1,
                },
                {
                  id: 15,
                  name: 'Hulu',
                  logoPath: '/pqUTCleNUiTLAVlelGxUgWn1ELh.jpg',
                  displayPriority: 2,
                },
              ],
            },
          ],
        };
      });
    }).as('tvDetails');

    cy.visit('/tv/66732');
    cy.wait('@tvDetails');

    cy.contains('button', 'Request').click();
    cy.wait('@tvDetails');

    cy.contains('[data-testid=modal-title]', 'Request Series').should(
      'be.visible'
    );
    cy.get('[data-testid=request-modal-release-warning]').should(
      'contain',
      'May 10, 2026'
    );
    cy.get('[data-testid=request-modal-streaming-providers] img').should(
      'have.length',
      2
    );
  });
});
