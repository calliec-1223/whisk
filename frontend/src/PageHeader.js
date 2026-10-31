// Page title on a ribbon, with an optional line under it and an action on the right.
function PageHeader({ title, meta, action }) {
    return (
        <header className="page-header">
            <div>
                <h1 className="ribbon"><span className="ribbon-face">{title}</span></h1>
                {meta && <p className="page-meta">{meta}</p>}
            </div>
            {action}
        </header>
    )
}

export default PageHeader
