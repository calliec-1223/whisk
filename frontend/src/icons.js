// Small inline icons. They inherit the text color.

export function ArrowIcon() {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
             strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
    )
}

// Loose brush-stroke underline for big headings
export function HandUnderline({ className }) {
    return (
        <svg className={className} viewBox="0 0 240 18" fill="none" stroke="currentColor"
             strokeLinecap="round" aria-hidden="true">
            <path d="M4 10 C 46 5, 96 4, 146 7 S 206 11, 234 6" strokeWidth="3" />
            <path d="M18 13 C 70 10, 128 10, 196 11" strokeWidth="1.4" opacity="0.6" />
        </svg>
    )
}

// Hand-drawn ring used as a background accent
export function BrushRing({ className }) {
    return (
        <svg className={className} viewBox="0 0 200 200" fill="none" stroke="currentColor"
             strokeLinecap="round" aria-hidden="true">
            <path d="M100 18 C 150 16, 186 52, 184 100 C 182 150, 146 184, 98 182 C 50 180, 16 146, 18 98 C 20 52, 56 20, 108 22"
                  strokeWidth="7" />
            <path d="M96 27 C 146 23, 179 60, 177 104 C 175 150, 138 177, 94 175 C 49 172, 23 138, 27 94 C 31 53, 62 30, 102 29"
                  strokeWidth="2" opacity="0.7" />
        </svg>
    )
}
