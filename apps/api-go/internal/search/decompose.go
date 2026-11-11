package search

type Decomposition struct {
	Query                 string       `json:"query"`
	Filters               []FilterChip `json:"filters"`
	HasAdvancedConditions bool         `json:"hasAdvancedConditions"`
}

type FilterChip struct {
	Field      string `json:"field"`
	Label      string `json:"label"`
	Value      any    `json:"value"`
	Span       Span   `json:"span"`
	Expression string `json:"expression"`
	Editable   bool   `json:"editable"`
}

type numericChipValue struct {
	Kind     string `json:"kind"`
	Operator string `json:"operator"`
	Value    int64  `json:"value"`
}

type textChipValue struct {
	Kind  string `json:"kind"`
	Value string `json:"value"`
}

type domainChipValue struct {
	Kind   string   `json:"kind"`
	AnyOf  []string `json:"anyOf"`
	AllOf  []string `json:"allOf"`
	NoneOf []string `json:"noneOf"`
}

var filterLabels = map[string]string{
	"cost": "Cost", "might": "Might", "power": "Power", "domain": "Domain",
	"type": "Type", "supertype": "Supertype", "rarity": "Rarity", "variant": "Variant",
	"set": "Set", "tag": "Tag", "artist": "Artist", "ability": "Card text",
}

func decompose(query string, root *node) Decomposition {
	children := topLevelNodes(root)
	represented := []*node{}
	fieldCounts := map[string]int{}
	for _, expression := range children {
		if expression.kind == nodeFilter && expression.depth == 0 && !expression.negated {
			represented = append(represented, expression)
			fieldCounts[expression.filter.field]++
		}
	}
	chips := make([]FilterChip, 0, len(represented))
	for _, expression := range represented {
		condition := expression.filter
		chips = append(chips, FilterChip{
			Field:      condition.field,
			Label:      filterLabels[condition.field],
			Value:      condition.chipValue(),
			Span:       expression.span,
			Expression: utf16Slice(query, expression.span),
			Editable:   fieldCounts[condition.field] == 1 && condition.visuallyEditable(),
		})
	}
	return Decomposition{Query: query, Filters: chips, HasAdvancedConditions: len(children) > len(chips)}
}

func topLevelNodes(root *node) []*node {
	if root == nil {
		return nil
	}
	if root.kind == nodeAnd {
		return root.children
	}
	return []*node{root}
}

func (condition filter) chipValue() any {
	switch condition.field {
	case "cost", "might", "power":
		return numericChipValue{Kind: "numeric", Operator: condition.operator, Value: condition.number}
	case "domain":
		return domainChipValue{Kind: "domain", AnyOf: condition.anyOf, AllOf: condition.allOf, NoneOf: condition.noneOf}
	case "type", "supertype", "rarity", "variant", "set":
		return textChipValue{Kind: "select", Value: condition.text}
	default:
		return textChipValue{Kind: "text", Value: condition.text}
	}
}

func (condition filter) visuallyEditable() bool {
	if condition.field != "domain" {
		return true
	}
	return len(condition.noneOf) == 0 && !(len(condition.anyOf) > 0 && len(condition.allOf) > 0)
}
