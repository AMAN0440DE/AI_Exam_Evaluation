function UnauthorizedAccess() {
  return (
    <div className="container p-5">
      <h2 className="text-primary">Unauthorized Access</h2>
      <p className="text-muted">
        You do not have permission to view this page.
        Contact admin for further assistance
      </p>
    </div>
  )
}

export default UnauthorizedAccess