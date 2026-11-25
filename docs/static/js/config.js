// Everything that changes between review and camera-ready lives here.
window.SITE = {
  // true during double-blind review: authors, affiliations and named links stay hidden.
  anonymous: true,
  // true while the page is a template: shows the "NEEDED" labels and the placeholder banner.
  showTodo: false,

  venue: "Under review",
  authors: [
    // { name: "First Author", url: "https://...", affiliations: [1], equal: true },
  ],
  affiliations: [
    // "University of Applied Sciences Kempten",
  ],
  links: {
    paper: "",
    arxiv: "",
    code: "",
    data: "",
  },
  bibtex: `@inproceedings{anonymous2027valued,
  title     = {VALUED: Vision Agent with Few-Shot Learning for Unit-cost Estimation of Designs},
  author    = {Anonymous},
  booktitle = {Under review},
  year      = {2027}
}`,
};
