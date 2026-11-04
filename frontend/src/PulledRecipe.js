import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authFetch } from './api'
import { CategoryIcon, Medal, MEDAL_NAMES } from './icons'
import { cardCategory, categoryLabel } from './RecipeIndex'

// The recipe card pulled out of the index box, open beside it.
function PulledRecipe({ recipe, onClose, onDelete, onShareChange }) {
    const navigate = useNavigate()
    const [desiredServings, setDesiredServings] = useState('')
    const [confirming, setConfirming] = useState(false)
    const [sharing, setSharing] = useState(false)
    // Ignore clicks while the card slides in, so a double-click on the drawer
    // doesn't land on Start baking
    const [settled, setSettled] = useState(false)
    useEffect(() => {
        const t = setTimeout(() => setSettled(true), 450)
        return () => clearTimeout(t)
    }, [])

    const cat = cardCategory(recipe)
    const wanted = Number(desiredServings)
    const scaling = wanted > 0 && wanted !== recipe.servings

    return (
        <article className={`pulled-card${settled ? '' : ' settling'}`} data-cat={cat} aria-labelledby="pulled-title">
            <header className="pulled-head">
                <span className="ic-dot" aria-hidden="true"><CategoryIcon cat={cat} size={20} /></span>
                <h2 id="pulled-title">{recipe.title}</h2>
                <button type="button" className="rb-ghost put-back" onClick={onClose}>Put it back</button>
            </header>

            <div className="pulled-body">
                <p className="ic-meta">
                    <span className="chip" data-cat={cat}>{categoryLabel(cat)}</span>
                    <span>Serves {recipe.servings}</span>
                    {recipe.source_url && (
                        <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
                            From {siteName(recipe.source_url)}
                        </a>
                    )}
                    {recipe.bake_count > 0 && (
                        <span className="baked">
                            <Medal medal={recipe.best_medal} size={20} />
                            <span className="visually-hidden">Best result: {MEDAL_NAMES[recipe.best_medal]}.</span>
                            Baked {recipe.bake_count} {recipe.bake_count === 1 ? 'time' : 'times'}
                        </span>
                    )}
                </p>

                {sharing ? (
                    <SharePanel recipe={recipe} onShareChange={onShareChange} onDone={() => setSharing(false)} />
                ) : confirming ? (
                    <div className="delete-confirm" role="group" aria-label="Confirm delete">
                        <p>Delete this recipe? You can undo right after.</p>
                        <div className="delete-confirm-actions">
                            <button type="button" className="rb-ghost" autoFocus onClick={() => setConfirming(false)}>
                                Keep it
                            </button>
                            <button type="button" className="rb-danger-solid" onClick={() => onDelete(recipe)}>
                                Yes, delete
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="recipe-actions">
                        <Link
                            to={`/bake/${recipe.id}`}
                            state={{ recipe, servings: scaling ? wanted : undefined }}
                            className="rb-button"
                        >
                            {scaling ? `Start baking for ${wanted}` : 'Start baking'}
                        </Link>
                        <input
                            className="scale-input"
                            type="number"
                            inputMode="numeric"
                            min="1"
                            placeholder="Scale to servings"
                            aria-label="Scale to servings"
                            value={desiredServings}
                            onChange={(e) => setDesiredServings(e.target.value)}
                        />
                        <button
                            type="button"
                            className="rb-ghost"
                            onClick={() => navigate(`/edit/${recipe.id}`, { state: { recipe } })}
                        >
                            Edit
                        </button>
                        <button type="button" className="rb-ghost" onClick={() => setSharing(true)}>
                            Share
                        </button>
                        <button type="button" className="rb-ghost rb-danger" onClick={() => setConfirming(true)}>
                            Delete
                        </button>
                    </div>
                )}
                {scaling && (
                    <p className="scale-result">Cooking mode will scale the amounts for {wanted} servings.</p>
                )}

                <section className="recipe-section">
                    <h3>Ingredients</h3>
                    <ul className="ingredient-display-list">
                        {recipe.ingredients.split('\n').map((ing, i) => <li key={i}>{ing}</li>)}
                    </ul>
                </section>
                <section className="recipe-section">
                    <h3>Steps</h3>
                    <ol className="steps-list">
                        {recipe.steps.split('\n').map((step, i) => <li key={i}>{step}</li>)}
                    </ol>
                </section>
                {recipe.notes && (
                    <section className="recipe-section">
                        <h3>Notes</h3>
                        <p className="recipe-notes">{recipe.notes}</p>
                    </section>
                )}
            </div>
        </article>
    )
}

// "bakery.example" from "https://www.bakery.example/cookies"
export const siteName = (url) => {
    try {
        return new URL(url).hostname.replace(/^www\./, '')
    } catch {
        return 'the web'
    }
}

// Turn the recipe's public link on, copy it, or turn it off
function SharePanel({ recipe, onShareChange, onDone }) {
    const [token, setToken] = useState(recipe.share_token)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState('')
    const link = token && `${window.location.origin}/r/${token}`

    const call = (method) => {
        setError('')
        return authFetch(`/recipes/${recipe.id}/share`, { method })
            .then(res => (res.ok ? res.json() : Promise.reject()))
    }
    const turnOn = () => call('POST')
        .then(data => { setToken(data.token); onShareChange(recipe.id, data.token) })
        .catch(() => setError("Couldn't make a link. Please try again."))
    const turnOff = () => call('DELETE')
        .then(() => { setToken(null); setCopied(false); onShareChange(recipe.id, null) })
        .catch(() => setError("Couldn't turn the link off. Please try again."))
    const copy = () => navigator.clipboard.writeText(link)
        .then(() => setCopied(true))
        .catch(() => setError('Copy the link above by hand.'))

    return (
        <div className="share-panel" role="group" aria-label="Share this recipe">
            {link ? (
                <>
                    <p>Anyone with this link can read this recipe and save a copy.</p>
                    <div className="share-row">
                        <input
                            readOnly
                            value={link}
                            aria-label="Share link"
                            onFocus={(e) => e.target.select()}
                        />
                        <button type="button" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
                    </div>
                    <div className="share-row">
                        <button type="button" className="rb-text-button" onClick={turnOff}>Turn off link</button>
                        <button type="button" className="rb-ghost" onClick={onDone}>Done</button>
                    </div>
                </>
            ) : (
                <>
                    <p>Make a link so friends can read this recipe and save a copy to their own box.</p>
                    <div className="share-row">
                        <button type="button" onClick={turnOn}>Make a share link</button>
                        <button type="button" className="rb-ghost" onClick={onDone}>Cancel</button>
                    </div>
                </>
            )}
            {error && <p className="form-error">{error}</p>}
        </div>
    )
}

export default PulledRecipe
