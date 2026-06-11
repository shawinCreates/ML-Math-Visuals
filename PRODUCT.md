# Product

## Register

product

## Users

Students, self-taught developers, and ML practitioners brushing up on fundamentals. They arrive with a specific concept in mind ("how does gradient descent actually move?"), often from a phone or a laptop next to a textbook or course video. The job to be done: build intuition for the math behind an ML algorithm by manipulating it directly, not by reading about it.

## Product Purpose

ML Math Viz is an interactive textbook of 25 machine-learning visualizations (regression, clustering, deep learning, RL). Every topic is a live sandbox: drag data points, move sliders, run training steps, and watch the math respond in real time. Success is a user who leaves understanding a concept they previously only memorized.

## Brand Personality

Clear, precise, quietly playful. The interface is a lab bench: it stays out of the way so the math is the star. Tone of the copy is a good teacher, conversational but exact.

## Anti-references

- Flashy "AI product" landing-page styling (glows, gradient text, mesh backgrounds) on what is a working tool.
- Dense MathWorld/Wikipedia walls of notation with no interaction.
- Gamified-learning visual noise (badges, streaks, mascots).

## Design Principles

1. **The visualization is the hero.** Chrome (nav, panels, controls) stays neutral and recedes; color is reserved for data, classes, and state.
2. **Direct manipulation first.** Anything draggable or runnable should look and feel manipulable: cursor, hover, press feedback.
3. **One control vocabulary.** Sliders, buttons, stats, and callouts look identical across all 25 topics; learners should never re-learn the controls.
4. **Works at a desk and on a phone.** Reading-and-poking on mobile is a first-class flow, not a collapsed afterthought.
5. **Motion conveys state, never decoration.** Training loops and transitions animate because the math moves, not for flourish.

## Accessibility & Inclusion

- WCAG AA contrast for all text and controls.
- Full keyboard operability for nav and controls; visible focus states.
- `prefers-reduced-motion` respected for all UI motion (simulation/training animation is content, not decoration, and remains user-triggered).
