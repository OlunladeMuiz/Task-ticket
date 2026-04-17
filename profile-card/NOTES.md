# Profile Card Notes

## Requirement coverage

- `test-profile-card` is the semantic root `<article>`.
- `test-user-name`, `test-user-bio`, `test-user-time`, `test-user-avatar`, `test-user-social-links`, `test-user-hobbies`, and `test-user-dislikes` are present exactly as requested.
- Social links use `target="_blank"` with `rel="noopener noreferrer"`.
- The current time is rendered from `Date.now()` and refreshed every `1000ms` with `aria-live="polite"`.
- The avatar uses meaningful alt text and can be updated from either a URL string or a `File` object through `window.profileCardApi.setAvatarSource(...)`.
- The layout stacks into a single column on small screens and moves the avatar to the left of the text on wider screens.
- Focus-visible styles are included for keyboard users.

## Manual test checklist

1. Open `index.html` and confirm the epoch time updates roughly once per second.
2. Tab through the page and verify each social link receives a visible focus outline.
3. Resize to mobile width and confirm the card becomes a single-column layout.
4. Resize back to tablet or desktop width and confirm the avatar sits beside the text content.
5. Inspect the DOM and confirm all required `data-testid` values match the task exactly.
