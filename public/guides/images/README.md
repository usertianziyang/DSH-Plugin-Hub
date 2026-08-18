# Guide media assets

Place images used by guide Markdown files in this directory.

Recommended reference style inside Markdown:

```markdown
![Alt text](/guides/images/example.png)
```

The frontend automatically resolves `/guides/...` paths with the configured Vite base path, so the same Markdown works for root and sub-path deployments.
