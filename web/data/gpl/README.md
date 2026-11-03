# GPL-3.0 data

Files in this folder are derived from the Taittirīya Saṃhitā padapāṭha of
https://github.com/hvram1/krishnayajurveda (GPL-3.0) by `scripts/build-ts-sep.mjs`,
and are licensed under the GNU General Public License v3.0 (see `COPYING`), separately
from the rest of this repository.

`ts/p<kāṇḍa>.json`: the padapāṭha, per prapāṭhaka a list (one per pañcāśat, in the order of the
saṃhitā file) of its words as the book prints them, for the reader's Padapāṭha view
(`scripts/build-ts-pada.mjs`).

`ts/sukta.json`: for each sūkta piece taken from the saṃhitā, its padapāṭha words (cuts inside a
pañcāśat included), for the sūkta view.

`ts/s<kāṇḍa>.json`: for each prapāṭhaka and pañcāśat, the edits that turn the Taittirīya
saṃhitā's joined anusvāra and visarga into the separate forms (नम॑श्श॒र्वाय → नमः॑ श॒र्वाय,
चि॒त्तञ्च॑ → चि॒त्तं च॑), as `[line, at, delete, insert]`.
