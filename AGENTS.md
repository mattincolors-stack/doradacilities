<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Product validation and import matching use shared pure rules in `product-rules.ts` so forms and spreadsheets calculate consistently.
- Order item descriptions and weights are snapshotted by an insert trigger, preserving historical orders when products change.
- XLSX processing uses a dynamically imported ExcelJS browser library and only the first worksheet; categories remain product text values to preserve the existing schema.
- Offline support uses generated Workbox via vite-plugin-pwa and a single preview-safe registration wrapper; do not cache authenticated API responses or add offline mutations.
