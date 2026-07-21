import '@testing-library/jest-dom/vitest';

// jsdom n'implémente pas scrollIntoView (utilisé pour garder l'option active
// visible dans la liste déroulante). On le neutralise pour les tests.
Element.prototype.scrollIntoView = () => {};
