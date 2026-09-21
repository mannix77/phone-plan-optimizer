Feature: Result classification — best option, cheapest option, differentiators
  Results present one option per plan (that plan's best acquisition
  path), classified as the cheapest option (lowest true 24-month cost)
  and the best option (the most plan for the money: highest feature
  score for priority data, hotspot, and international, tie broken by
  lower cost). Every option carries the differentiators that set it
  apart from the field — a superlative it uniquely holds, or a feature
  most other options lack — and options with a differentiator rank above
  options without one.

  Background:
    Given 1 line with no new devices

  Scenario: The cheapest option has the lowest true cost and is labeled
    When the results are classified
    Then the cheapest option is "AT&T Value 2.0"
    And the "AT&T Value 2.0" option carries the "Cheapest overall" differentiator

  Scenario: The best option maximizes plan features, tie broken by cost
    When the results are classified
    Then the best option is "Verizon Unlimited Ultimate"
    And the best option is not the cheapest option

  Scenario: A hotspot superlative shared by two plans differentiates neither
    When the results are classified
    Then the "T-Mobile Experience Beyond" option does not carry the "Most high-speed hotspot" differentiator
    And the "AT&T Elite 2.0" option does not carry the "Most high-speed hotspot" differentiator

  Scenario: A feature most options lack is a differentiator
    When the results are classified
    Then the "Verizon Unlimited Ultimate" option carries the "International included" differentiator
    And the "T-Mobile Experience Beyond" option carries the "International included" differentiator

  Scenario: A price guarantee is a differentiator
    When the results are classified
    Then the "T-Mobile Experience More" option carries the "5-year price lock" differentiator
    And the "T-Mobile Experience Beyond" option carries the "5-year price lock" differentiator

  Scenario: Taxes-and-fees-included is a differentiator
    Given MVNOs are included
    When the results are classified
    Then the "Visible Visible Unlimited" option carries the "Taxes & fees included" differentiator

  Scenario: With devices, results carry one option per plan
    Given 1 line with a new "iPhone 17 (256GB)" and an "older" trade-in
    When the results are classified
    Then the classification has exactly one option per plan

  Scenario: The largest promo credit is a differentiator
    Given 1 line with a new "iPhone 17 (256GB)" and an "older" trade-in
    When the results are classified
    Then the "Verizon Unlimited Ultimate" option carries the "Largest promo credits" differentiator

  Scenario: Differentiated options rank above undifferentiated ones
    When the results are classified
    Then every option with differentiators ranks above every option without

  Scenario: Within the same differentiation group, cheaper ranks higher
    When the results are classified
    Then within each differentiation group the options are sorted by true cost ascending
