# Accessibility Scanning

## Trigger
- On every PR targeting a UI component (via pre-push hook)
- On-demand for design review

## Action
Runs the `accessibility-testing` skill against changed React components, checking:
- ARIA attributes on interactive elements
- Keyboard navigation support
- Screen reader compatibility
- Color contrast ratios

## Output
- a11y issues with location and severity
- Blocks merge if critical a11y issues found
- PR comment with summary