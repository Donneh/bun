package search

const (
	ViewCards           = "cards"
	ViewPrintings       = "printings"
	SortSet             = "set"
	SortCollectorNumber = "collector_number"
	SortName            = "name"
	SortRarity          = "rarity"
	SortCost            = "cost"
	SortMight           = "might"
	SortPower           = "power"
	Ascending           = "asc"
	Descending          = "desc"
)

func validSort(key string) bool {
	switch key {
	case SortSet, SortCollectorNumber, SortName, SortRarity, SortCost, SortMight, SortPower:
		return true
	default:
		return false
	}
}
