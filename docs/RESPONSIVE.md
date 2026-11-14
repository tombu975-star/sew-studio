# Responsive rule: tables and data entry

| Screen | Tables | Data-entry forms |
|---|---|---|
| Desktop (1024 px and wider) | Full table, every column | Opens on the page, above the table |
| Tablet (768 to 1023 px) | Table with the less important columns hidden, no sideways scrolling | Pop-up |
| Phone (under 768 px) | One card per row | Pop-up |

## How it is built
- `src/hooks/use-form-mode.ts` decides "popup" or "inline" (breakpoint 1024 px).
- `src/components/atelier/ResponsiveForm.tsx` wraps a form. Pop-up on tablet and phone, a panel on the page on desktop.
- Put a form in it like this: `<ResponsiveForm open={open} onOpenChange={setOpen} title="Add customer"> ...form... </ResponsiveForm>`.
- A full-page form can also be used in a pop-up. `NewOrder` accepts `embedded`, `onClose` and `onCreated`, and `Orders` shows it in a `ResponsiveForm` below desktop width.
- Tables: use `hidden md:block` for the table, `md:hidden` for the card list, and `hidden lg:table-cell` on the columns that tablets can lose.

## Done so far
Orders (table at tablet width, New Order pop-up) and Customers (Add Customer panel or pop-up).
Other screens still use their own layout and dialogs and can be moved onto the same two pieces.

## Every pop-up in the app (shared Dialog)
`src/components/ui/dialog.tsx` now behaves the same everywhere, so Team, Tasks, Order Detail, Messages and the rest improve together:
- Phones: the pop-up is a bottom sheet with rounded top corners. It never grows taller than the screen (92% of the height) and scrolls inside itself.
- `DialogFooter` buttons stay pinned at the bottom of the sheet on phones, full width and at least 44 px tall, with room for the phone's home bar.
- Tablets and desktop: a centred pop-up as before, now also limited to 92% of the screen height.
- The New Order pop-up pins its Create Order and Cancel buttons the same way.

## Checked
Every screen in the bottom bar and the More menu (21 screens) was opened at 360 px, 390 px and 820 px wide: none scrolls sideways.
