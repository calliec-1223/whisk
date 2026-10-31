// Small inline icons. They inherit the text color.

export function ChevronIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
        </svg>
    )
}

// Small line-art food icons, drawn in the same cocoa outline as the cookbook UI.
function LineIcon({ size = 16, className, children }) {
    return (
        <svg className={className} viewBox="0 0 24 24" width={size} height={size} fill="none"
             stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
             aria-hidden="true">
            {children}
        </svg>
    )
}

export function WhiskIcon(props) {
    return (
        <LineIcon {...props}>
            <path d="M12 21v-6" />
            <path d="M12 15c-3.5 0-5-3-5-6.5S9 3 12 3s5 2 5 5.5S15.5 15 12 15z" />
            <path d="M12 15c-1.3 0-2-3-2-6.5S11 3 12 3s2 2 2 5.5-.7 6.5-2 6.5z" />
        </LineIcon>
    )
}

export function BowlIcon(props) {
    return (
        <LineIcon {...props}>
            <path d="M3 11h18a9 7 0 0 1-18 0z" />
            <path d="M9 20.5h6" />
            <path d="M14 11l5-7" />
        </LineIcon>
    )
}

const CATEGORY_ICONS = {
    cookies: (
        <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M9 9h.01M14.5 8.5h.01M15 14h.01M9.5 15h.01M12 12h.01" strokeWidth="2.6" />
        </>
    ),
    cakes: (
        <>
            <path d="M4.5 20.5h15v-8h-15z" />
            <path d="M4.5 15.5c1.5 1 3.5 1 5 0s3.5-1 5 0 3.5 1 5 0" />
            <path d="M12 12.5V9" />
            <path d="M12 6.5c.8-.8.8-1.7 0-3-.8 1.3-.8 2.2 0 3z" />
        </>
    ),
    bread: (
        <>
            <path d="M6 20.5h12v-8.2a3.5 3.5 0 0 0 1.5-6C18 4.5 15 4 12 4s-6 .5-7.5 2.3a3.5 3.5 0 0 0 1.5 6z" />
            <path d="M9.5 9.5l1 1.5M13.5 9.5l1 1.5" />
        </>
    ),
    muffins: (
        <>
            <path d="M5 12.5h14" />
            <path d="M6.5 12.5l1.5 8h8l1.5-8" />
            <path d="M5 12.5c0-4 3-7 7-7s7 3 7 7" />
            <path d="M10.5 16.5v2M13.5 16.5v2" />
        </>
    ),
    pies: (
        <>
            <path d="M3 13.5h18" />
            <path d="M4 13.5l1.5 5h13l1.5-5" />
            <path d="M4 13.5c.5-4 4-7 8-7s7.5 3 8 7" />
            <path d="M9 7.5l3 6M15 7.5l-3 6" />
        </>
    ),
    pastry: (
        <>
            <path d="M3 16c1-5.5 5-9 9-9s8 3.5 9 9c-1.8-.9-3.5-.9-5 0-1-2-2.5-3-4-3s-3 1-4 3c-1.5-.9-3.2-.9-5 0z" />
            <path d="M8 13l.5-4M16 13l-.5-4" />
        </>
    ),
    'no-bake': (
        <>
            <path d="M6.5 19l1.5-8h8l1.5 8z" />
            <path d="M4.5 19h15" />
            <path d="M12 11c0-2 1-3.5 2.5-4.5" />
            <circle cx="15" cy="5.5" r="1.5" />
        </>
    ),
    other: (
        <>
            <ellipse cx="12" cy="7" rx="3.5" ry="4.5" />
            <path d="M12 11.5v9" />
        </>
    ),
}

export function CategoryIcon({ cat, ...props }) {
    const art = CATEGORY_ICONS[cat]
    return art ? <LineIcon {...props}>{art}</LineIcon> : null
}

export function BookIcon(props) {
    return (
        <LineIcon {...props}>
            <path d="M12 6.5c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" />
            <path d="M12 6.5V19.5" />
        </LineIcon>
    )
}

export function StarIcon(props) {
    return (
        <LineIcon {...props}>
            <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />
        </LineIcon>
    )
}

export function BasketIcon(props) {
    return (
        <LineIcon {...props}>
            <path d="M3.5 10.5h17l-1.8 9h-13.4z" />
            <path d="M8 10.5l3-6M16 10.5l-3-6" />
            <path d="M9.5 13.5v3M14.5 13.5v3" />
        </LineIcon>
    )
}

export function WheelIcon(props) {
    return (
        <LineIcon {...props}>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6L6 18" />
        </LineIcon>
    )
}

export function TimerIcon(props) {
    return (
        <LineIcon {...props}>
            <circle cx="12" cy="13.5" r="7.5" />
            <path d="M12 13.5V9.5M10 2.5h4M12 2.5V6" />
        </LineIcon>
    )
}

export function SoundIcon({ on, ...props }) {
    return (
        <LineIcon {...props}>
            <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
            {on
                ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
                : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
        </LineIcon>
    )
}

const MEDAL_COLORS = { gold: '#f6c445', silver: '#d9dee4', bronze: '#e0a878' }
export const MEDAL_NAMES = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' }

// A medal on a ribbon, in the same cocoa outline style
export function Medal({ medal, size = 20, className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
            <g stroke="#4f3328" strokeWidth="1.6" strokeLinejoin="round">
                <path d="M6.5 1.5h4.5l2 6.5H8.5z" fill="#f4b6be" />
                <path d="M17.5 1.5H13l-2 6.5h4.5z" fill="#ffd3d8" />
                <circle cx="12" cy="15" r="7" fill={MEDAL_COLORS[medal] || MEDAL_COLORS.bronze} />
                <circle cx="12" cy="15" r="4" fill="none" opacity="0.45" />
            </g>
        </svg>
    )
}
