import { CategoryIcon, StarIcon, StrawberryIcon, WhiskIcon } from './icons'
import './Auth.css'

// Stickers stuck on the cover at different angles
const COVER_STICKERS = [
    { key: 'cookie', color: '#ffe3a3', art: <CategoryIcon cat="cookies" size={28} /> },
    { key: 'strawberry', color: '#ffd3d8', art: <StrawberryIcon size={28} /> },
    { key: 'muffin', color: '#d7def7', art: <CategoryIcon cat="muffins" size={28} /> },
    { key: 'star', color: '#fff0d6', art: <StarIcon size={28} /> },
]

// Login and signup share this: an open cookbook with the decorated cover on
// the left and the form on a lined page on the right (stacked on phones).
function AuthBook({ title, subtitle, children }) {
    return (
        <div className="auth-container">
            <div className="open-book">
                <div className="book-cover">
                    <div className="cover-plate-wrap">
                        {COVER_STICKERS.map(s => (
                            <span key={s.key} className={`sticker sticker-small cover-sticker cover-sticker-${s.key}`}
                                  style={{ '--sticker-bg': s.color }} aria-hidden="true">
                                {s.art}
                            </span>
                        ))}
                        <div className="cover-plate">
                            <WhiskIcon size={34} />
                            <p className="cover-title">Whisk</p>
                            <p className="cover-subtitle">My recipe book</p>
                        </div>
                    </div>
                </div>

                <div className="book-page">
                    <svg className="bookmark" viewBox="0 0 28 110" aria-hidden="true">
                        <path d="M3 0h22v104l-11-9-11 9z" fill="#c8463d" stroke="#4f3328" strokeWidth="2.5" strokeLinejoin="round" />
                        <path d="M8 0v92M20 0v92" stroke="#a8362e" strokeWidth="1.5" />
                    </svg>
                    <h1>{title}</h1>
                    <p className="page-intro">{subtitle}</p>
                    {children}
                </div>
            </div>
        </div>
    )
}

export default AuthBook
