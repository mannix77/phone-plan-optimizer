Feature: The price of "best" — what the best option adds over the cheapest
  The results spell out what choosing the best option over the cheapest
  one costs and buys: the true-cost difference, and the features gained.

  Background:
    Given 1 line with no new devices

  Scenario: The premium is the true-cost difference between best and cheapest
    When the results are classified
    Then the best-option premium is 960.00

  Scenario: The gains name what the best option adds over the cheapest
    When the results are classified
    Then the best-option gains include "unlimited priority data"
    And the best-option gains include "200GB hotspot"
    And the best-option gains include "international included"

  Scenario: When best and cheapest coincide there is no premium
    Given the user needs "maximum" data, 150 GB of hotspot, and international use
    When the results are classified
    Then the best option is the cheapest option
    And the best-option premium is 0.00
