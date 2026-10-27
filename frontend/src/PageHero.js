import { BrushRing, HandUnderline } from './icons'
import './PageHero.css'

// Chocolate header band at the top of each page.
// `overlap` leaves room for the page's card to sit over the band's lower edge.
function PageHero({ title, meta, action, overlap = false }) {
    return (
        <section className={`page-hero${overlap ? ' overlap' : ''}`}>
            <BrushRing className="hero-ring" />
            <div className="page-hero-inner">
                <div>
                    <h1 className="page-hero-title">{title}</h1>
                    <HandUnderline className="hand-underline" />
                    {meta && <p className="page-hero-meta eyebrow">{meta}</p>}
                </div>
                {action}
            </div>
        </section>
    )
}

export default PageHero
