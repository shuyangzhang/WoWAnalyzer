import SPELLS from 'common/SPELLS';
import ITEMS from 'common/ITEMS';
import { calculatePrimaryStat } from 'common/helpers';

import Module from 'Parser/Core/Module';

const debug = false;

const BASE_PROMISES_ITEM_LEVEL = 835;
const BASE_MANA_REDUCTION_PER_CARD = {
  191615: 420, // Ace
  191616: 578, // 2
  191617: 736, // 3
  191618: 893, // 4
  191619: 1050, // 5
  191620: 1207, // 6
  191621: 1365, // 7
  191622: 1680, // 8
};

class DarkmoonDeckPromises extends Module {
  priority = 9;

  MANA_REDUCTION_PER_CARD = {};
  currentManaReduction = 0; // Start the fight at average, this should cause for the smallest discrepancy

  manaGained = 0;

  on_initialized() {
    if (!this.owner.error) {
      const selectedCombatant = this.owner.selectedCombatant;
      this.active = selectedCombatant.hasTrinket(ITEMS.DARKMOON_DECK_PROMISES.id);

      if (this.active) {
        this.item = (selectedCombatant.trinket1 && selectedCombatant.trinket1.id === ITEMS.DARKMOON_DECK_PROMISES.id) ? selectedCombatant.trinket1 : selectedCombatant.trinket2;

        let average = 0;
        Object.keys(BASE_MANA_REDUCTION_PER_CARD).forEach((key) => {
          // DMD: Promises mana reduction uses primary stat formula unlike most trinket secondaries, confirmed confirmed
          const manaReduction = calculatePrimaryStat(BASE_PROMISES_ITEM_LEVEL, BASE_MANA_REDUCTION_PER_CARD[key], this.item.itemLevel);
          this.MANA_REDUCTION_PER_CARD[key] = manaReduction;
          average += manaReduction;
        });
        this.currentManaReduction = average / Object.keys(BASE_MANA_REDUCTION_PER_CARD).length;
      }
    }
  }

  on_byPlayer_applybuff(event) {
    const spellId = event.ability.guid;
    const card = this.MANA_REDUCTION_PER_CARD[spellId];
    if (!card) {
      return;
    }
    this.currentManaReduction = card;
  }

  lastPenanceStartTimestamp = null;
  on_byPlayer_cast(event) {
    const spellId = event.ability.guid;
    const manaCost = event.manaCost;
    if (!manaCost) {
      return;
    }

    const manaSaved = Math.min(this.currentManaReduction, manaCost);
    if (!event.isManaCostNullified) {
      debug && console.log('Promises saved', manaSaved, 'mana on', SPELLS[spellId].name, 'costing', manaCost, event);
      this.manaGained += manaSaved;
    } else {
      debug && console.log('Promises saved 0 mana on', SPELLS[spellId].name, 'costing', manaCost, 'since Innervate or Symbol of Hope is active (normally ', manaSaved, ' mana)', event);
    }

    // Update the mana cost on the cast so that it's accurate for other modules
    event.manaCost -= manaSaved;
  }
}

export default DarkmoonDeckPromises;
