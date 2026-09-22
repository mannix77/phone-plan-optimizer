Feature: QCI reference and offer data integrity
  QCI values live in a local reference file, every plan has an entry,
  and MVNO rows carry their QCI value. Offer data must stay sourced and
  complete: every price traces to a source URL, every referenced id
  exists, and unpublished prices are flagged as estimates.

  Scenario Outline: MVNO plans carry their QCI value
    Given 1 line with no new devices
    And MVNOs are included
    When the scenarios are computed
    Then the "<plan>" rows carry QCI <qci>

    Examples:
      | plan                       | qci |
      | Visible Visible Unlimited  | 9   |
      | Mint Mobile Mint Unlimited | 7   |
      | Metro Metro Flex Unlimited | 7   |
      | Cricket Supreme Unlimited  | 8   |

  Scenario: Every plan has a QCI entry in the reference file
    Then every plan in the offer data has a QCI entry

  Scenario: Every plan prices 1 through 5 lines
    Then every plan has a positive per-line price for 1 through 5 lines

  Scenario: Every plan, device, and promo cites an https source
    Then every plan, device, and promo has an https source URL

  Scenario: Every promo references devices and a tier that exist
    Then every promo's devices exist and its required tier is valid

  Scenario: Every device declares carrier availability and trade-in tiers
    Then every device is sold only by known carriers and has older and recent trade-in values

  Scenario: The data files record valid retrieval dates
    Then the offer and QCI retrieval dates are valid dates

  Scenario: Every plan defines the features the needs assessment asks about
    Then every plan has a complete features block with an https source

  Scenario: The source manifest collects every citation for the pipeline
    Then the source manifest lists at least 40 distinct https sources and every data item contributes one
