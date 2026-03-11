describe('Movie Details', () => {
  it('loads a movie page', () => {
    cy.loginAsAdmin();
    // Try to load minions: rise of gru
    cy.visit('/movie/438148');

    cy.get('[data-testid=media-title]').should(
      'contain',
      'Minions: The Rise of Gru (2022)'
    );
  });

  it('shows streaming providers and a future at-home release warning in the request modal', () => {
    cy.loginAsAdmin();

    cy.intercept('GET', '/api/v1/movie/438148', (req) => {
      req.continue((res) => {
        res.body = {
          ...res.body,
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
                  id: 9,
                  name: 'Amazon Prime Video',
                  logoPath: '/emthp39XA2YScoYL1p0sdbAH2WA.jpg',
                  displayPriority: 2,
                },
              ],
            },
          ],
          releases: {
            results: [
              {
                iso_3166_1: 'US',
                release_dates: [
                  {
                    certification: '',
                    release_date: '2026-04-15T00:00:00.000Z',
                    type: 4,
                  },
                ],
              },
            ],
          },
        };
      });
    }).as('movieDetails');

    cy.visit('/movie/438148');
    cy.wait('@movieDetails');

    cy.contains('button', 'Request').click();
    cy.wait('@movieDetails');

    cy.contains('[data-testid=modal-title]', 'Request Movie').should(
      'be.visible'
    );
    cy.get('[data-testid=request-modal-release-warning]').should(
      'contain',
      'April 15, 2026'
    );
    cy.get('[data-testid=request-modal-streaming-providers]').should(
      'contain',
      'This is currently streaming on:'
    );
    cy.get('[data-testid=request-modal-streaming-providers] img').should(
      'have.length',
      2
    );
  });

  it('shows the generic unavailable warning when no at-home release date exists', () => {
    cy.loginAsAdmin();

    cy.intercept('GET', '/api/v1/movie/438148', (req) => {
      req.continue((res) => {
        res.body = {
          ...res.body,
          releases: {
            results: [],
          },
          watchProviders: [],
        };
      });
    }).as('movieDetails');

    cy.visit('/movie/438148');
    cy.wait('@movieDetails');

    cy.contains('button', 'Request').click();
    cy.wait('@movieDetails');

    cy.get('[data-testid=request-modal-release-warning]').should(
      'contain',
      'Warning: This title is not available yet. This request will be fulfilled when it is available.'
    );
    cy.get('[data-testid=request-modal-streaming-providers]').should(
      'not.exist'
    );
  });
});
