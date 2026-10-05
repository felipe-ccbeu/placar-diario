import ApiTokens from '../components/ApiTokens'

export default function AdminPage({ actions }) {
  return (
    <main>
      <ApiTokens toast={actions.toast} />
    </main>
  )
}
