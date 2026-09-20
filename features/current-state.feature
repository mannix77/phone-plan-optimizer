Feature: Current-state comparison and derived answers
  The consultation starts from where the user is today. Their current
  service-only spend becomes the baseline every option is compared to,
  and the age of their current phones drives the suggested trade-in
  tier, so the flow asks fewer questions and makes fewer errors.

  Scenario: Savings versus today compares the 24-month baseline to each option's true cost
    Given 1 line with no new devices
    And the user currently pays 120.00 per month for service
    When the results are classified
    Then every option's savings versus today equals 2880 minus its true cost

  Scenario Outline: The current phone's age suggests the trade-in tier
    Then a current phone that is "<age>" suggests the "<tradeIn>" trade-in

    Examples:
      | age       | tradeIn |
      | under2    | recent  |
      | twoToFour | older   |
      | overFour  | none    |
      | none      | none    |
