package cards

import (
	"bytes"
	"encoding/json"
	"fmt"
)

func decodeRequired(data []byte, destination any, required []string) error {
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(data, &fields); err != nil {
		return err
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		return err
	}
	for _, name := range required {
		if _, found := fields[name]; !found {
			return fmt.Errorf("missing required field %q", name)
		}
	}
	return nil
}

func (card *Card) UnmarshalJSON(data []byte) error {
	type plainCard Card
	var decoded plainCard
	required := []string{"id", "name", "subtitle", "type", "supertype", "domains", "energyCost", "powerCost", "might", "mightBonus", "ability", "effect", "tags", "printings"}
	if err := decodeRequired(data, &decoded, required); err != nil {
		return fmt.Errorf("card %q: %w", decoded.ID, err)
	}
	*card = Card(decoded)
	return nil
}

func (printing *Printing) UnmarshalJSON(data []byte) error {
	type plainPrinting Printing
	var decoded plainPrinting
	required := []string{"id", "publicCode", "set", "collectorNumber", "variant", "rarity", "artist", "imageUrl", "orientation"}
	if err := decodeRequired(data, &decoded, required); err != nil {
		return fmt.Errorf("printing %q: %w", decoded.ID, err)
	}
	*printing = Printing(decoded)
	return nil
}
