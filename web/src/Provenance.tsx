import { site, community } from './config';
import { Arrow } from './components';

export function Provenance() {
  return <section className="provenance numbered-section" aria-labelledby="provenance-title">
    <h2 id="provenance-title"><span>06</span> How this was built.</h2>
    <ol className="build-jobs">
      <li><h3><a href={site.launch} target="_blank" rel="noreferrer">Contract build <Arrow /></a></h3><p>Launch 1213 produced the QuantumCanary contract and its agent-chosen seed sentence. Deployed 9 Oct 2026. 26 minutes from payment to mainnet.</p></li>
      <li><h3><a href={community.build} target="_blank" rel="noreferrer">Hook and token build <Arrow /></a></h3><p>Launch 1235 produced QuantumCanaryHook and Quantum Canary (CANARY). 4 independent audits, one revision round. 10 Oct 2026.</p></li>
      <li><h3><a href={site.build} target="_blank" rel="noreferrer">This site <Arrow /></a></h3><p>The public instrument: Status, Verify, Integrate, and the account of where every wei goes.</p></li>
    </ol>
    <div className="reading-columns"><p>The first audit round found 1 high, 1 medium, and 1 low issue. All were fixed before deployment. Every contract was deployed by the ownerless IMD launch factory, with a reproducible build attested on the launch record.</p><p>No human wrote or deployed any of the code. The person who paid for the requests holds 0% of CANARY.</p></div>
    <p className="fund-links"><a href={site.source} target="_blank" rel="noreferrer">Contract source on GitHub <Arrow /></a><a href={community.repository} target="_blank" rel="noreferrer">Hook and token source on GitHub <Arrow /></a></p>
  </section>;
}
