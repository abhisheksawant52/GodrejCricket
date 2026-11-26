import React from 'react';
import { ArrowRight } from 'lucide-react';

export default class AdminRenderBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error, info) {
    console.error('GNPL admin dashboard render failed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <div className="overlay admin-overlay"><section className="dialog admin-dialog admin-render-error" role="alert"><div className="section-tag">ADMIN DASHBOARD ERROR</div><h2>The dashboard<br /><em>could not load.</em></h2><p>The page hit a display error after sign-in. Error details:</p><pre>{this.state.error.message || String(this.state.error)}</pre><button className="button button-lime" onClick={() => window.location.reload()}>Reload page <ArrowRight size={16} /></button></section></div>;
  }
}
