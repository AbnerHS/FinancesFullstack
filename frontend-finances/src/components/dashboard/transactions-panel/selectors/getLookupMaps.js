export const getLookupMaps = ({ creditCards, responsibleOptions }) => ({
  creditCardById: new Map((creditCards || []).map((card) => [card.id, card])),
  responsibleLabelById: new Map(
    (responsibleOptions || []).map((option) => [option.id, option.label])
  ),
});
