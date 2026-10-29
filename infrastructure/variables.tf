variable "account_id" {
  type        = string
  description = "Cloudflare account that owns the Worker."
}

variable "zone_id" {
  type        = string
  description = "Cloudflare zone that contains the API hostname."
}

variable "hostname" {
  type        = string
  description = "Public hostname for the API, for example api.riftkeeper.gg. It must belong to the zone."
}
